import test from 'node:test';
import assert from 'node:assert/strict';
import type { TimelineClip } from '../types/cut';
import {
  computeClipMediaTime,
  computeClipAnimationState,
  computeClipTransitionState,
  buildClipColorAndFx,
  buildClipMaskAndCropCss,
  computeAudioClipGain,
  rippleDeleteClip,
  moveClipWithMagneticSnap,
  freezeFrameAtPlayhead,
  detachAudioFromClip,
  generateSrtFromClips
} from './cutRenderMath';
import { formatVlcTimecode, isVideoMediaUrl } from './playbackClock';

function makeClip(overrides: Partial<TimelineClip> = {}): TimelineClip {
  return {
    id: 'clip-1',
    trackId: 'V1',
    name: 'Test Clip',
    type: 'video',
    start: 2,
    duration: 4,
    inPoint: 1,
    outPoint: 5,
    url: 'blob:test-video',
    posX: 0,
    posY: 0,
    scale: 100,
    rotation: 0,
    opacity: 100,
    blendMode: 'normal',
    mask: 'none',
    crop: { top: 0, bottom: 0, left: 0, right: 0 },
    animation: { inType: 'fade-in', outType: 'fade-out', duration: 0.5 },
    adjustments: {
      brightness: 100,
      contrast: 100,
      saturation: 100,
      temperature: 0,
      shadows: 0,
      highlights: 0,
      sharpen: 0,
      vignette: 0,
      grain: 0
    },
    speed: { multiplier: 1.0, ramp: 'constant', isReversed: false, isFrozen: false },
    audio: { volume: 100, fadeIn: 0.5, fadeOut: 0.5, noiseReduction: false },
    ...overrides
  };
}

test('computeClipMediaTime handles forward, 2x speed, reversed, and frozen states', () => {
  const fwd = makeClip();
  assert.equal(computeClipMediaTime(fwd, 3.5), 2.5);

  const fast = makeClip({ outPoint: 9, speed: { multiplier: 2.0, ramp: 'constant', isReversed: false, isFrozen: false } });
  assert.equal(computeClipMediaTime(fast, 3.5), 4.0);

  const rev = makeClip({ speed: { multiplier: 1.0, ramp: 'constant', isReversed: true, isFrozen: false } });
  assert.equal(computeClipMediaTime(rev, 3.0), 4.0);

  const frozen = makeClip({ speed: { multiplier: 1.0, ramp: 'constant', isReversed: false, isFrozen: true } });
  assert.equal(computeClipMediaTime(frozen, 5.5), 1.0);
});

test('computeClipAnimationState & computeClipTransitionState evaluate head/tail curves cleanly', () => {
  const clip = makeClip({
    start: 0,
    duration: 4,
    transition: { type: 'gold-flash', duration: 0.6 }
  });

  const headAnim = computeClipAnimationState(clip, 0);
  assert.equal(headAnim.opacityMultiplier, 0);
  const midAnim = computeClipAnimationState(clip, 2);
  assert.equal(midAnim.opacityMultiplier, 1);

  const headTrans = computeClipTransitionState(clip, 0.1);
  assert.equal(headTrans.active, true);
  assert.equal(headTrans.overlayColor, '#f59e0b');
  assert.ok(headTrans.overlayOpacity > 0.4);

  const postTrans = computeClipTransitionState(clip, 1.5);
  assert.equal(postTrans.active, false);
});

test('buildClipColorAndFx and buildClipMaskAndCropCss build shader CSS & crop masks', () => {
  const clip = makeClip({
    effectShader: 'VHS Glitch',
    mask: 'rectangle',
    crop: { top: 10, bottom: 10, left: 5, right: 5 },
    adjustments: {
      brightness: 110,
      contrast: 120,
      saturation: 110,
      temperature: 20,
      shadows: 0,
      highlights: 0,
      sharpen: 10,
      vignette: 30,
      grain: 25
    }
  });

  const fx = buildClipColorAndFx(clip);
  assert.equal(fx.shaderOverlayClass, 'rawx-shader-scanlines');
  assert.equal(fx.rgbSplitPx, 3);
  assert.equal(fx.warmthOverlayColor, '#f59e0b');
  assert.ok(fx.filterCss.includes('brightness('));

  const maskCss = buildClipMaskAndCropCss(clip);
  assert.ok(maskCss.clipPath?.includes('inset(10%'));
});

test('computeAudioClipGain honors track Mute, Solo, master mute, 200% boost, and fade envelopes', () => {
  const clip = makeClip({
    trackId: 'A1',
    start: 0,
    duration: 4,
    audio: { volume: 150, fadeIn: 0.5, fadeOut: 0.5, noiseReduction: false }
  });

  assert.equal(computeAudioClipGain(clip, 2, { muted: false, solo: false, locked: false, hidden: false }, false, false), 1.5);
  assert.equal(computeAudioClipGain(clip, 2, { muted: true, solo: false, locked: false, hidden: false }, false, false), 0);
  assert.equal(computeAudioClipGain(clip, 2, { muted: false, solo: false, locked: false, hidden: false }, true, false), 0);
  assert.equal(computeAudioClipGain(clip, 2, { muted: false, solo: true, locked: false, hidden: false }, true, false), 1.5);
  assert.equal(computeAudioClipGain(clip, 0.25, { muted: false, solo: false, locked: false, hidden: false }, false, false), 0.75);
});

test('rippleDeleteClip shifts downstream same-track clips without moving unrelated tracks', () => {
  const c1 = makeClip({ id: 'c1', trackId: 'V1', start: 0, duration: 2 });
  const c2 = makeClip({ id: 'c2', trackId: 'V1', start: 2, duration: 3 });
  const c3 = makeClip({ id: 'c3', trackId: 'V1', start: 5, duration: 2 });
  const a1 = makeClip({ id: 'a1', trackId: 'A1', start: 2, duration: 4 });

  const after = rippleDeleteClip([c1, c2, c3, a1], 'c2');
  assert.equal(after.length, 3);
  assert.equal(after.find(c => c.id === 'c3')?.start, 2);
  assert.equal(after.find(c => c.id === 'a1')?.start, 2);
});

test('moveClipWithMagneticSnap snaps clip edge within threshold', () => {
  const c1 = makeClip({ id: 'c1', trackId: 'V1', start: 0, duration: 3 });
  const c2 = makeClip({ id: 'c2', trackId: 'V1', start: 6, duration: 2 });
  const moved = moveClipWithMagneticSnap([c1, c2], 'c2', 3.08, 'V1', 0.2);
  assert.equal(moved.snappedAt, 3);
  assert.equal(moved.clips.find(c => c.id === 'c2')?.start, 3);
});

test('freezeFrameAtPlayhead and detachAudioFromClip produce expected NLE clips', () => {
  const v1 = makeClip({ id: 'v1', trackId: 'V1', start: 0, duration: 4, inPoint: 0, outPoint: 4 });
  const frozen = freezeFrameAtPlayhead([v1], 'v1', 1.5, 2.0);
  assert.ok(frozen.freezeClipId);
  assert.equal(frozen.clips.length, 3);
  const freezeSeg = frozen.clips.find(c => c.id === frozen.freezeClipId);
  assert.equal(freezeSeg?.speed.isFrozen, true);
  assert.equal(freezeSeg?.duration, 2.0);

  const extracted = detachAudioFromClip([v1], 'v1');
  assert.ok(extracted.audioClipId);
  assert.equal(extracted.clips.find(c => c.id === 'v1')?.audio.volume, 0);
  assert.equal(extracted.clips.find(c => c.id === extracted.audioClipId)?.trackId, 'A1');
});

test('generateSrtFromClips and VLC clock helpers format cleanly', () => {
  const t1 = makeClip({ id: 't1', trackId: 'T1', start: 1.5, duration: 2.5, text: 'Hello', bengaliText: 'হ্যালো' });
  const srt = generateSrtFromClips([t1]);
  assert.ok(srt.includes('00:00:01,500 --> 00:00:04,000'));
  assert.ok(srt.includes('Hello\nহ্যালো'));

  assert.equal(formatVlcTimecode(125.5, true), '02:05.50');
  assert.equal(formatVlcTimecode(3661), '1:01:01');
  assert.equal(isVideoMediaUrl('blob:https://app/123', false, 'video/mp4'), true);
  assert.equal(isVideoMediaUrl('https://cdn.example.com/clip.webm'), true);
  assert.equal(isVideoMediaUrl('https://cdn.example.com/frame.jpg'), false);
});
