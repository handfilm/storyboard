/**
 * @file /src/utils/scrubNleMath.test.ts
 * @description Unit tests for CapCut-grade real-time NLE cutting, trimming, ripple delete & speed math.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { SlideDraft } from '../types/project';
import {
  splitClipAtTime,
  trimClipEdge,
  trimStartToPlayheadQ,
  trimEndToPlayheadW,
  rippleDeleteClip,
  applyClipSpeed,
  getClipSourceWindow,
  getClipSourceMediaTimeSec
} from './scrubNleMath';

function makeSlide(id: string, durationSec = 12.0, overrides: Partial<SlideDraft> = {}): SlideDraft {
  return {
    id,
    orderIndex: 0,
    duration: durationSec,
    durationSec,
    targetFps: 24,
    aspectRatio: '2.39:1',
    titleEn: `Shot ${id}`,
    titleBn: `দৃশ্য ${id}`,
    mediaVaultKey: id.replace(/^slide_/, ''),
    ...overrides
  };
}

test('splitClipAtTime slices active clip into Part A and Part B with contiguous in/out timestamps', () => {
  const initial = [makeSlide('slide_0', 12.0), makeSlide('slide_1', 6.0)];
  const res = splitClipAtTime(initial, 0, 4.5, true);

  assert.equal(res.changed, true);
  assert.equal(res.slides.length, 3);
  assert.equal(res.activeIndex, 1);
  assert.equal(res.localTimeSec, 0);

  const partA = res.slides[0];
  const partB = res.slides[1];
  assert.equal(partA.titleEn, 'Shot slide_0 (Part A)');
  assert.equal(partB.titleEn, 'Shot slide_0 (Part B)');
  assert.equal(partA.durationSec, 4.5);
  assert.equal(partB.durationSec, 7.5);
  assert.equal(partA.inPointMs, 0);
  assert.equal(partA.outPointMs, 4500);
  assert.equal(partB.inPointMs, 4500);
  assert.equal(partB.outPointMs, 12000);
  assert.equal(partA.mediaVaultKey, '0');
  assert.equal(partB.mediaVaultKey, '0');
  assert.notEqual(partA.id, partB.id);
});

test('splitClipAtTime refuses split too close to clip boundary', () => {
  const initial = [makeSlide('slide_0', 1.0)];
  const res = splitClipAtTime(initial, 0, 0.1, true);
  assert.equal(res.changed, false);
  assert.equal(res.slides.length, 1);
});

test('trimClipEdge left [| and right |] trim in/out points cleanly while preserving ripple bounds', () => {
  const initial = [makeSlide('slide_0', 12.0)];
  // Trim left edge right by +3.0s -> inPointMs becomes 3000, duration 9.0s
  const leftTrim = trimClipEdge(initial, 0, 'left', 3.0, true);
  assert.equal(leftTrim.changed, true);
  assert.equal(leftTrim.slides[0].inPointMs, 3000);
  assert.equal(leftTrim.slides[0].outPointMs, 12000);
  assert.equal(leftTrim.slides[0].durationSec, 9.0);
  assert.equal(leftTrim.scrubPreviewSourceSec, 3.0);

  // Trim right edge left by -2.0s on trimmed clip -> outPointMs becomes 10000, duration 7.0s
  const rightTrim = trimClipEdge(leftTrim.slides, 0, 'right', -2.0, true);
  assert.equal(rightTrim.changed, true);
  assert.equal(rightTrim.slides[0].inPointMs, 3000);
  assert.equal(rightTrim.slides[0].outPointMs, 10000);
  assert.equal(rightTrim.slides[0].durationSec, 7.0);
});

test('trimStartToPlayheadQ & trimEndToPlayheadW behave like CapCut Q/W ripple trims', () => {
  const initial = [makeSlide('slide_0', 10.0), makeSlide('slide_1', 5.0)];

  // Q at 2.5s cuts head [0..2.5s] and resets playhead to 0
  const afterQ = trimStartToPlayheadQ(initial, 0, 2.5, true);
  assert.equal(afterQ.changed, true);
  assert.equal(afterQ.localTimeSec, 0);
  assert.equal(afterQ.slides[0].inPointMs, 2500);
  assert.equal(afterQ.slides[0].outPointMs, 10000);
  assert.equal(afterQ.slides[0].durationSec, 7.5);

  // W at 3.0s on that 7.5s clip trims tail -> outPoint becomes 2.5 + 3.0 = 5.5s, duration 3.0s
  const afterW = trimEndToPlayheadW(afterQ.slides, 0, 3.0, true);
  assert.equal(afterW.changed, true);
  assert.equal(afterW.slides[0].inPointMs, 2500);
  assert.equal(afterW.slides[0].outPointMs, 5500);
  assert.equal(afterW.slides[0].durationSec, 3.0);
});

test('rippleDeleteClip removes clip and closes gap without deleting last clip', () => {
  const initial = [makeSlide('a', 4.0), makeSlide('b', 6.0), makeSlide('c', 5.0)];
  const deleted = rippleDeleteClip(initial, 1);
  assert.equal(deleted.changed, true);
  assert.equal(deleted.slides.length, 2);
  assert.equal(deleted.slides[0].id, 'a');
  assert.equal(deleted.slides[1].id, 'c');
  assert.equal(deleted.slides[1].orderIndex, 1);

  const single = rippleDeleteClip([makeSlide('only', 4.0)], 0);
  assert.equal(single.changed, false);
});

test('applyClipSpeed scales timeline duration and maps source media time accurately', () => {
  const clip = makeSlide('slide_0', 8.0, { inPointMs: 2000, outPointMs: 10000 });
  const sped = applyClipSpeed([clip], 0, 2.0);
  assert.equal(sped.changed, true);
  assert.equal(sped.slides[0].playbackSpeed, 2.0);
  assert.equal(sped.slides[0].durationSec, 4.0);

  const win = getClipSourceWindow(sped.slides[0]);
  assert.equal(win.sourceSpanSec, 8.0);
  assert.equal(win.timelineDurationSec, 4.0);

  // At localTimeSec = 1.5s at 2.0x speed starting from inSec=2.0s -> source timestamp = 2.0 + 1.5*2 = 5.0s
  const srcSec = getClipSourceMediaTimeSec(sped.slides[0], 1.5);
  assert.equal(srcSec, 5.0);
});
