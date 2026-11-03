import { test } from 'node:test';
import assert from 'node:assert';
import {
  transientPunchEngine,
  clampImpactIntensity,
  AUDIO_PUNCH_MODES
} from './transientPunchEngine';
import {
  KINETIC_TYPOGRAPHY_PRESETS,
  computeKineticTypographyState,
  tokenizeChopperWords
} from './kineticTypographyStyles';
import {
  depthOcclusionService,
  computeFallbackLumaEdgeMattePixels,
  DEPTH_LAYER_MODES
} from './depthOcclusionService';
import { useStudioStore } from '../core/store';

test('Dual-band transient detector isolates <120Hz 808 kicks vs 1kHz-5kHz vocal bursts', () => {
  const sampleRate = 48000;
  const duration = 2.0;
  const totalSamples = sampleRate * duration;
  const channel = new Float32Array(totalSamples);

  // Inject <120Hz (62Hz) 808 kick burst at t = 0.25s
  const kickStart = Math.floor(0.25 * sampleRate);
  for (let i = 0; i < Math.floor(0.14 * sampleRate); i++) {
    const t = i / sampleRate;
    channel[kickStart + i] += Math.sin(2 * Math.PI * 62 * t) * Math.exp(-t * 24) * 0.95;
  }

  // Inject 1kHz-5kHz (2600Hz) vocal/snare transient at t = 1.10s
  const vocalStart = Math.floor(1.10 * sampleRate);
  for (let i = 0; i < Math.floor(0.06 * sampleRate); i++) {
    const t = i / sampleRate;
    channel[vocalStart + i] += Math.sin(2 * Math.PI * 2600 * t) * Math.exp(-t * 48) * 0.9;
  }

  const map = transientPunchEngine.analyzeBufferDualBand({
    sampleRate,
    duration,
    numberOfChannels: 1,
    getChannelData: () => channel
  });

  assert.ok(map.kickPeaks.length >= 1, 'Should detect <120Hz kick peak');
  assert.ok(
    map.kickPeaks.some((p) => Math.abs(p.timeSec - 0.25) < 0.06),
    'Kick peak should align near 0.25s'
  );
  assert.ok(
    !map.kickPeaks.some((p) => Math.abs(p.timeSec - 1.10) < 0.06),
    '2.6kHz burst must not false-trigger <120Hz kick detector'
  );

  assert.ok(map.vocalHits.length >= 1, 'Should detect 1kHz-5kHz vocal transient');
  assert.ok(
    map.vocalHits.some((p) => Math.abs(p.timeSec - 1.10) < 0.06),
    'Vocal hit should align near 1.10s'
  );
});

test('onKickPunch and onVocalHit emit normalized physics across [IMPACT: 0.0 to 2.0]', () => {
  assert.strictEqual(clampImpactIntensity(-1.5), 0.0);
  assert.strictEqual(clampImpactIntensity(3.4), 2.0);
  assert.strictEqual(clampImpactIntensity(1.35), 1.35);

  let lastKick: any = null;
  let lastVocal: any = null;
  const unsubKick = transientPunchEngine.onKickPunch((p) => {
    lastKick = p;
  });
  const unsubVocal = transientPunchEngine.onVocalHit((p) => {
    lastVocal = p;
  });

  transientPunchEngine.setImpact(2.0);
  transientPunchEngine.emitKickPunch(1.0, 0.5);
  assert.ok(lastKick, 'onKickPunch listener invoked');
  assert.strictEqual(lastKick.impact, 2.0);
  assert.strictEqual(lastKick.chromaticSplitPx, 17);
  assert.ok(lastKick.cameraShakeMatrix.scale > 1.04, 'Camera shake matrix scales on kick');

  transientPunchEngine.setImpact(0.0);
  transientPunchEngine.emitKickPunch(1.0, 0.8);
  assert.strictEqual(lastKick.chromaticSplitPx, 0);
  assert.strictEqual(lastKick.cameraShakeMatrix.tx, 0);

  transientPunchEngine.setImpact(1.0);
  transientPunchEngine.emitVocalHit(0.9, 1.2);
  assert.ok(lastVocal, 'onVocalHit listener invoked');
  assert.strictEqual(lastVocal.band, 'HIGH_MID_1KHZ_5KHZ');

  unsubKick();
  unsubVocal();
});

test('CHOPPER_RAP_PUNCH enforces 4-frame 120% -> 100% scale damping and -3px -> 0px tracking', () => {
  const words = tokenizeChopperWords('spit fire kinetic bars');
  assert.deepStrictEqual(words, ['SPIT', 'FIRE', 'KINETIC', 'BARS']);

  const frame0 = computeKineticTypographyState({
    preset: KINETIC_TYPOGRAPHY_PRESETS.CHOPPER_RAP_PUNCH,
    timeSec: 0.5,
    fps: 24,
    impact: 1.0,
    framesSinceVocalHit: 0,
    vocalHitIndex: 2,
    lyricText: 'spit fire kinetic bars'
  });
  assert.strictEqual(frame0.activeWord, 'KINETIC');
  assert.strictEqual(frame0.scale, 1.2);
  assert.strictEqual(frame0.letterSpacingPx, -3);

  const frame2 = computeKineticTypographyState({
    preset: KINETIC_TYPOGRAPHY_PRESETS.CHOPPER_RAP_PUNCH,
    timeSec: 0.58,
    fps: 24,
    impact: 1.0,
    framesSinceVocalHit: 2,
    vocalHitIndex: 2,
    lyricText: 'spit fire kinetic bars'
  });
  assert.strictEqual(frame2.scale, 1.1);
  assert.strictEqual(frame2.letterSpacingPx, -1.5);

  const frame4 = computeKineticTypographyState({
    preset: KINETIC_TYPOGRAPHY_PRESETS.CHOPPER_RAP_PUNCH,
    timeSec: 0.67,
    fps: 24,
    impact: 1.0,
    framesSinceVocalHit: 4,
    vocalHitIndex: 2,
    lyricText: 'spit fire kinetic bars'
  });
  assert.strictEqual(frame4.scale, 1.0);
  assert.strictEqual(frame4.letterSpacingPx, 0);
});

test('COMMERCIAL_TITAN_DROP stacks Bengali Unicode + uppercase English subtext with laser wipe & directional blur', () => {
  const dropStart = computeKineticTypographyState({
    preset: KINETIC_TYPOGRAPHY_PRESETS.COMMERCIAL_TITAN_DROP,
    timeSec: 0,
    fps: 24,
    impact: 1.0,
    bengaliText: 'মহাকর্ষের টান',
    englishSubtext: 'event horizon'
  });
  assert.strictEqual(dropStart.bengaliTitle, 'মহাকর্ষের টান');
  assert.strictEqual(dropStart.englishSubtext, 'EVENT HORIZON');
  assert.strictEqual(dropStart.wipeProgress, 0);
  assert.ok(dropStart.motionBlurVecPx.y > 20, 'Initial drop frame has strong vertical directional blur');

  const midWipe = computeKineticTypographyState({
    preset: KINETIC_TYPOGRAPHY_PRESETS.COMMERCIAL_TITAN_DROP,
    timeSec: 8 / 24,
    fps: 24,
    impact: 1.0,
    bengaliText: 'মহাকর্ষের টান',
    englishSubtext: 'event horizon'
  });
  assert.ok(midWipe.wipeProgress > 0.3 && midWipe.wipeProgress < 1.0, 'Laser wipe reveals mid-flight');

  const settled = computeKineticTypographyState({
    preset: KINETIC_TYPOGRAPHY_PRESETS.COMMERCIAL_TITAN_DROP,
    timeSec: 1.0,
    fps: 24,
    impact: 1.0,
    bengaliText: 'মহাকর্ষের টান',
    englishSubtext: 'event horizon'
  });
  assert.strictEqual(settled.wipeProgress, 1);
  assert.strictEqual(settled.motionBlurVecPx.y, 0);
});

test('DepthOcclusionService enforces 3-layer stack order and luma/edge fallback subject matte', () => {
  assert.deepStrictEqual(
    depthOcclusionService.getLayerStackOrder(DEPTH_LAYER_MODES.BEHIND_SUBJECT),
    ['BASE_PASS', 'TEXT_PASS', 'SUBJECT_PASS']
  );
  assert.deepStrictEqual(
    depthOcclusionService.getLayerStackOrder(DEPTH_LAYER_MODES.FOREGROUND),
    ['BASE_PASS', 'SUBJECT_PASS', 'TEXT_PASS']
  );

  // 16x16 dark frame with bright high-contrast 6x6 central subject
  const width = 16;
  const height = 16;
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y++) {
    for (let x = 0; x < width; x++) {
      const idx = (y * width + x) * 4;
      const isSubject = x >= 5 && x <= 10 && y >= 5 && y <= 10;
      const val = isSubject ? 245 : 8;
      rgba[idx] = val;
      rgba[idx + 1] = val;
      rgba[idx + 2] = val;
      rgba[idx + 3] = 255;
    }
  }

  const matte = computeFallbackLumaEdgeMattePixels(rgba, width, height, 0.42);
  const cornerAlpha = matte[3];
  const centerAlpha = matte[(8 * width + 8) * 4 + 3];
  assert.strictEqual(cornerAlpha, 0, 'Dark background periphery must be masked out (alpha = 0)');
  assert.strictEqual(centerAlpha, 255, 'High-contrast central subject must be opaque foreground (alpha = 255)');

  // Verify Zustand store synchronization with depthOcclusionService & transientPunchEngine
  const store = useStudioStore.getState();
  store.setDepthLayerMode('FOREGROUND');
  store.setAudioPunchMode(AUDIO_PUNCH_MODES.VOCAL);
  store.setAutonomousKineticPreset(KINETIC_TYPOGRAPHY_PRESETS.CHOPPER_RAP_PUNCH);
  store.setKineticImpact(1.65);

  assert.strictEqual(depthOcclusionService.getConfig().layerMode, 'FOREGROUND');
  assert.strictEqual(transientPunchEngine.getMode(), 'VOCAL');
  assert.strictEqual(depthOcclusionService.getConfig().preset, 'CHOPPER_RAP_PUNCH');
  assert.strictEqual(transientPunchEngine.getImpact(), 1.65);

  // Restore defaults
  store.setDepthLayerMode('BEHIND_SUBJECT');
  store.setAudioPunchMode(AUDIO_PUNCH_MODES.KICK);
  store.setAutonomousKineticPreset(KINETIC_TYPOGRAPHY_PRESETS.COMMERCIAL_TITAN_DROP);
  store.setKineticImpact(1.0);
});
