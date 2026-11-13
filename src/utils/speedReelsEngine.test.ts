import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { SlideDraft } from '../types/project';
import {
  BEAT_INTERVAL_OPTIONS,
  HYPER_REEL_FPS,
  HYPER_REEL_TOTAL_FRAMES,
  HYPER_REEL_TOTAL_SEC,
  computeSmartCropRect,
  evaluateBeatDropFx,
  evaluateSpeedRampSourceTime,
  pack12sHyperReel
} from './speedReelsEngine';
import { getClipSourceWindow, slipClipWindow } from './scrubNleMath';

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

test('pack12sHyperReel packs 1, 2, 5, and 12 slides into an exact 12.00s (288 frames @ 24fps) sequence', () => {
  const empty = pack12sHyperReel([]);
  assert.equal(empty.selectedCount, 0);
  assert.equal(empty.totalDurationSec, 0);
  assert.equal(empty.totalFrames, 0);

  for (const count of [1, 2, 5, 12]) {
    const input = Array.from({ length: count }, (_, i) =>
      makeSlide(i, {
        isVideo: i % 2 === 0,
        remoteUrl: i % 2 === 0 ? `blob:video-${i}` : `blob:still-${i}`
      })
    );
    const result = pack12sHyperReel(input);
    assert.equal(result.totalDurationSec, HYPER_REEL_TOTAL_SEC);
    assert.equal(result.totalFrames, HYPER_REEL_TOTAL_FRAMES);

    const summedDuration = result.slides.reduce((acc, s) => acc + (s.durationSec ?? 0), 0);
    assert.ok(Math.abs(summedDuration - HYPER_REEL_TOTAL_SEC) < 0.01, `Summed duration ${summedDuration} != 12.00 for count=${count}`);

    const summedFrames = result.slides.reduce(
      (acc, s) => acc + Math.round((s.durationSec ?? 0) * HYPER_REEL_FPS),
      0
    );
    assert.equal(summedFrames, HYPER_REEL_TOTAL_FRAMES);

    if (count >= 10) {
      assert.equal(result.slides.length, 10);
      assert.equal(result.slides[0].durationSec, 1.5);
      for (let k = 1; k <= 8; k++) {
        assert.equal(result.slides[k].durationSec, 1.0);
      }
      assert.equal(result.slides[9].durationSec, 2.5);
    }
  }
});

test('pack12sHyperReel prioritizes highest-energy video/media shots while preserving chronological flow', () => {
  const slides = Array.from({ length: 14 }, (_, i) =>
    makeSlide(i, {
      id: `shot_${i}`,
      isVideo: i >= 4,
      remoteUrl: i >= 4 ? `blob:clip-${i}` : ''
    })
  );
  const packed = pack12sHyperReel(slides);
  assert.equal(packed.selectedCount, 10);
  // Every selected shot should come from the video-backed indices 4..13 and retain ascending orderIndex 0..9
  assert.ok(packed.slides.every((s) => s.isVideo));
  assert.deepEqual(
    packed.slides.map((s) => s.orderIndex),
    [0, 1, 2, 3, 4, 5, 6, 7, 8, 9]
  );
  assert.ok(packed.slides.every((s) => s.flashCutEnabled && s.beatDropEnabled));
});

test('evaluateSpeedRampSourceTime stays monotonically non-decreasing and honors inPointMs across all presets', () => {
  const presets = ['NONE', 'BULLET_TIME', 'WHIP_CUT', 'HEARTBEAT'] as const;
  for (const preset of presets) {
    const slide = makeSlide(0, {
      inPointMs: 2000,
      outPointMs: 6000,
      durationSec: 4.0,
      speedRampPreset: preset
    });
    let prev = evaluateSpeedRampSourceTime(slide, 0);
    assert.ok(Math.abs(prev - 2.0) < 1e-6);
    for (let step = 1; step <= 20; step++) {
      const t = (step / 20) * 4.0;
      const cur = evaluateSpeedRampSourceTime(slide, t);
      assert.ok(cur >= prev, `Non-monotonic source time at t=${t} for ${preset}: ${cur} < ${prev}`);
      prev = cur;
    }
  }
});

test('evaluateBeatDropFx triggers 2-frame flash cuts, chromatic pulse, and kinetic beat title slam at every beat interval', () => {
  for (const interval of BEAT_INTERVAL_OPTIONS) {
    const slide = makeSlide(0, {
      flashCutEnabled: true,
      beatDropEnabled: true,
      flashCutIntervalSec: interval
    });

    // Frame 0 stays visible (not blacked out) while carrying beat slam recoil
    const startFx = evaluateBeatDropFx(slide, 0, HYPER_REEL_FPS);
    assert.equal(startFx.isFlashCutFrame, false);
    assert.ok(startFx.beatSlamScale > 1.0);

    // Exact 2 frames at beat index 1 trigger Vantablack flash cut
    const beat1Frame0 = evaluateBeatDropFx(slide, interval, HYPER_REEL_FPS);
    const beat1Frame1 = evaluateBeatDropFx(slide, interval + 1 / HYPER_REEL_FPS, HYPER_REEL_FPS);
    const beat1Frame2 = evaluateBeatDropFx(slide, interval + 2 / HYPER_REEL_FPS, HYPER_REEL_FPS);

    assert.equal(beat1Frame0.isFlashCutFrame, true);
    assert.equal(beat1Frame1.isFlashCutFrame, true);
    assert.equal(beat1Frame2.isFlashCutFrame, false);
    assert.ok(beat1Frame0.chromaticOffsetPx > 0);
  }
});

test('computeSmartCropRect frames wide horizontal 2.39:1 sources cleanly into 9:16 1080x1920 within source bounds', () => {
  const srcW = 3840;
  const srcH = 1608;
  const dstW = 1080;
  const dstH = 1920;

  const left = computeSmartCropRect(srcW, srcH, dstW, dstH, { smartCropMode: 'LEFT' });
  const center = computeSmartCropRect(srcW, srcH, dstW, dstH, { smartCropMode: 'CENTER' });
  const right = computeSmartCropRect(srcW, srcH, dstW, dstH, { smartCropMode: 'RIGHT' });
  const autoZoom = computeSmartCropRect(srcW, srcH, dstW, dstH, { smartCropMode: 'AUTO_ZOOM' });

  for (const r of [left, center, right, autoZoom]) {
    assert.ok(r.sx >= 0 && r.sx + r.sw <= srcW + 1e-6);
    assert.ok(r.sy >= 0 && r.sy + r.sh <= srcH + 1e-6);
    assert.equal(r.dw, dstW);
    assert.equal(r.dh, dstH);
  }

  assert.ok(left.sx < center.sx && center.sx < right.sx);
  assert.ok(autoZoom.sw < center.sw && autoZoom.sh < center.sh);
});

test('slipClipWindow shifts source inPoint/outPoint cleanly without altering timeline duration', () => {
  const slides = [
    makeSlide(0, { inPointMs: 1000, outPointMs: 5000, durationSec: 4.0, playbackSpeed: 1.0 })
  ];
  const slippedForward = slipClipWindow(slides, 0, 0.5, true);
  assert.equal(slippedForward.changed, true);
  const winFwd = getClipSourceWindow(slippedForward.slides[0]);
  assert.equal(winFwd.timelineDurationSec, 4.0);
  assert.ok(Math.abs(winFwd.inSec - 1.5) < 0.02);
  assert.ok(Math.abs(winFwd.outSec - 5.5) < 0.02);

  // Slipping backward past 0 clamps safely at 0
  const slippedBack = slipClipWindow(slippedForward.slides, 0, -5.0, true);
  assert.equal(slippedBack.changed, true);
  const winBack = getClipSourceWindow(slippedBack.slides[0]);
  assert.equal(winBack.inSec, 0);
  assert.equal(winBack.outSec, 4.0);
  assert.equal(winBack.timelineDurationSec, 4.0);
});
