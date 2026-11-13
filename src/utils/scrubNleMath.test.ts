import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { SlideDraft } from '../types/project';
import {
  findNearestTransientSec,
  generateClipWaveformProfile,
  getClipSourceWindow,
  rollClipCutPoint
} from './scrubNleMath';
import {
  evaluateKeyframeRampAtProgress,
  evaluateSpeedRampSourceTime
} from './speedReelsEngine';
import { videoCacheService } from '../services/videoCacheService';
import { screenRecorderEngine } from '../services/screenRecorderEngine';

function makeSlide(idx: number, overrides: Partial<SlideDraft> = {}): SlideDraft {
  return {
    id: `slide_${idx}`,
    orderIndex: idx,
    titleEn: `Shot ${idx + 1}`,
    titleBn: `দৃশ্য ${idx + 1}`,
    tagline: `Tagline ${idx + 1}`,
    duration: 4.0,
    durationSec: 4.0,
    targetFps: 24,
    inPointMs: 0,
    outPointMs: 4000,
    playbackSpeed: 1.0,
    ...overrides
  };
}

test('rollClipCutPoint adjusts seam between adjacent clips while locking combined runtime', () => {
  const slides = [
    makeSlide(0, { inPointMs: 0, outPointMs: 4000, durationSec: 4.0 }),
    makeSlide(1, { inPointMs: 2000, outPointMs: 6000, durationSec: 4.0 })
  ];
  const initialTotal = slides[0].durationSec! + slides[1].durationSec!;

  // Roll cut point +1.0s right (extends clip 0 to 5.0s, pulls clip 1 inPoint earlier so clip 1 is 3.0s)
  const rolledRight = rollClipCutPoint(slides, 0, 1.0, true);
  assert.equal(rolledRight.changed, true);
  assert.equal(rolledRight.leftDurationSec, 5.0);
  assert.equal(rolledRight.rightDurationSec, 3.0);
  assert.equal(rolledRight.leftDurationSec + rolledRight.rightDurationSec, initialTotal);
  const rightWin = getClipSourceWindow(rolledRight.slides[1]);
  assert.ok(Math.abs(rightWin.inSec - 3.0) < 0.02);

  // Roll cut point -1.5s left from rolled state (shrinks clip 0 to 3.5s, recovers clip 1 head to 4.5s)
  const rolledLeft = rollClipCutPoint(rolledRight.slides, 0, -1.5, true);
  assert.equal(rolledLeft.changed, true);
  assert.equal(rolledLeft.leftDurationSec, 3.5);
  assert.equal(rolledLeft.rightDurationSec, 4.5);
  assert.equal(rolledLeft.leftDurationSec + rolledLeft.rightDurationSec, initialTotal);
});

test('evaluateKeyframeRampAtProgress & evaluateSpeedRampSourceTime honor custom Bezier speed-ramp curves', () => {
  const keyframes = [
    { u: 0, rate: 0.5 },
    { u: 0.5, rate: 3.0 },
    { u: 1, rate: 0.5 }
  ];

  const r0 = evaluateKeyframeRampAtProgress(keyframes, 0);
  const rMid = evaluateKeyframeRampAtProgress(keyframes, 0.5);
  const r1 = evaluateKeyframeRampAtProgress(keyframes, 1);
  assert.ok(r0 !== null && Math.abs(r0 - 0.5) < 1e-6);
  assert.ok(rMid !== null && Math.abs(rMid - 3.0) < 1e-6);
  assert.ok(r1 !== null && Math.abs(r1 - 0.5) < 1e-6);

  const slide = makeSlide(0, {
    inPointMs: 1000,
    outPointMs: 5000,
    durationSec: 4.0,
    speedRampKeyframes: keyframes
  });

  let prev = evaluateSpeedRampSourceTime(slide, 0);
  assert.ok(Math.abs(prev - 1.0) < 1e-6);
  for (let i = 1; i <= 20; i++) {
    const t = (i / 20) * 4.0;
    const cur = evaluateSpeedRampSourceTime(slide, t);
    assert.ok(cur >= prev, `Expected monotonic source time at ${t}: ${cur} < ${prev}`);
    prev = cur;
  }
});

test('generateClipWaveformProfile & findNearestTransientSec yield deterministic waveform peaks and beat snap', () => {
  const slide = makeSlide(0, { durationSec: 4.0, flashCutIntervalSec: 1.0 });
  const profile = generateClipWaveformProfile(slide, 0, 28);
  assert.equal(profile.bars.length, 28);
  assert.ok(profile.bars.every((b) => b >= 0.15 && b <= 1.0));
  assert.ok(profile.transientSeconds.length > 0);

  const firstTransient = profile.transientSeconds[0];
  const snapped = findNearestTransientSec(slide, 0, firstTransient + 0.01);
  assert.ok(Math.abs(snapped - firstTransient) <= 0.25);
});

test('videoCacheService keyframe ring-buffer nearest lookup resolves quantized cached frames', () => {
  const fakeUrl = 'blob:unit-test-ringbuffer-clip';
  const fakeBitmap = { close: () => {}, width: 320, height: 180 } as unknown as ImageBitmap;

  videoCacheService.setKeyframeBitmap(fakeUrl, 2.5, fakeBitmap);
  assert.ok(videoCacheService.getRingBufferCount(fakeUrl) >= 1);

  const near = videoCacheService.getNearestKeyframeBitmap(fakeUrl, 2.65, 0.5);
  assert.ok(near !== null);
  if (!near) throw new Error('Expected cached bitmap match');
  assert.equal(near.bitmap, fakeBitmap);
  assert.ok(Math.abs(near.cachedTimeSec - 2.5) < 0.05);

  const tooFar = videoCacheService.getNearestKeyframeBitmap(fakeUrl, 10.0, 0.5);
  assert.equal(tooFar, null);
});

test('screenRecorderEngine maintains deterministic idle/reset state machine contract', async () => {
  screenRecorderEngine.resetToIdle();
  assert.equal(screenRecorderEngine.getStatus(), 'idle');
  assert.equal(screenRecorderEngine.getLastCaptureResult(), null);

  screenRecorderEngine.cancelCountdown();
  const stopNoOp = await screenRecorderEngine.stopRecording();
  assert.equal(stopNoOp, null);
  assert.equal(screenRecorderEngine.getStatus(), 'idle');
});
