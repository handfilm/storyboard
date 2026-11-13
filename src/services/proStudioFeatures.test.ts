import { test } from 'node:test';
import assert from 'node:assert/strict';
import { useStudioStore } from '../core/store';
import { resolveExportVideoSeekSec } from './videoExportEngine';
import {
  CINEMATIC_TITLE_PRESETS,
  buildTitlePresetConfig,
  buildDefaultTitleLayers,
  DEFAULT_TITLE_KEYFRAMES,
  segmentTextGraphemes,
} from '../constants/titleTemplates';
import {
  processMidSideStereoSamples,
  encodeStereoFloat32ToWavBytes,
  synthesizeFoleyRecipeToWavBytes,
  FOLEY_PRESETS,
} from './vocalRemoverAndFoleyService';
import {
  normalizeShotLightConfig,
  kelvinToRgb,
  buildStageLightOverlayStyles,
} from './lightingRelightingService';
import { LIGHTING_PRESETS } from '../data/lightingPresets';

test('Stage viewport zoom scale, pro monitor toggles, and non-destructive shot reverse', () => {
  const store = useStudioStore.getState();
  assert.strictEqual(store.stageScale, 'fit');

  store.setStageScale(0.5);
  assert.strictEqual(useStudioStore.getState().stageScale, 0.5);

  store.setStageScale(0.75);
  assert.strictEqual(useStudioStore.getState().stageScale, 0.75);

  store.setStageScale(1.0);
  assert.strictEqual(useStudioStore.getState().stageScale, 1.0);

  store.setStageScale('fit');
  assert.strictEqual(useStudioStore.getState().stageScale, 'fit');

  const initialGuides = useStudioStore.getState().monitorGuidesVisible;
  store.toggleMonitorGuides();
  assert.strictEqual(useStudioStore.getState().monitorGuidesVisible, !initialGuides);
  store.toggleMonitorGuides();

  const initialPeaking = useStudioStore.getState().monitorFocusPeaking;
  store.toggleMonitorFocusPeaking();
  assert.strictEqual(useStudioStore.getState().monitorFocusPeaking, !initialPeaking);
  store.toggleMonitorFocusPeaking();

  const initialZebra = useStudioStore.getState().monitorZebraExposure;
  store.toggleMonitorZebraExposure();
  assert.strictEqual(useStudioStore.getState().monitorZebraExposure, !initialZebra);
  store.toggleMonitorZebraExposure();

  const initialSplit = useStudioStore.getState().monitorSplitCompare;
  store.toggleMonitorSplitCompare();
  assert.strictEqual(useStudioStore.getState().monitorSplitCompare, !initialSplit);
  store.setMonitorSplitPosition(68);
  assert.strictEqual(useStudioStore.getState().monitorSplitPosition, 68);
  store.toggleMonitorSplitCompare();

  const initialRev = Boolean(useStudioStore.getState().project.shots[0]?.isReversed);
  store.toggleShotReverse(0);
  assert.strictEqual(Boolean(useStudioStore.getState().project.shots[0]?.isReversed), !initialRev);

  const fwdSeekEarly = resolveExportVideoSeekSec({ durationSec: 10 }, {}, 24, 24, 10, false);
  const revSeekEarly = resolveExportVideoSeekSec({ durationSec: 10 }, {}, 24, 24, 10, true);
  assert.ok(fwdSeekEarly < 2 && fwdSeekEarly >= 0.9, `Expected forward seek ~1.0s, got ${fwdSeekEarly}`);
  assert.ok(revSeekEarly > 8.5, `Expected reverse seek ~9.0s, got ${revSeekEarly}`);

  // Restore shot 0 reverse flag
  if (Boolean(useStudioStore.getState().project.shots[0]?.isReversed) !== initialRev) {
    store.toggleShotReverse(0);
  }
});

test('24 CINEMATIC_TITLE_PRESETS cover viral-hooks & end-credits, 5-layer builder, keyframes, and Bangla grapheme safety', () => {
  assert.strictEqual(CINEMATIC_TITLE_PRESETS.length, 24);
  const viralHooks = CINEMATIC_TITLE_PRESETS.filter((p) => p.category === 'viral-hooks');
  const endCredits = CINEMATIC_TITLE_PRESETS.filter((p) => p.category === 'end-credits');
  assert.strictEqual(viralHooks.length, 4);
  assert.strictEqual(endCredits.length, 4);

  const sampleCfg = buildTitlePresetConfig(viralHooks[0]);
  const layers = buildDefaultTitleLayers(sampleCfg);
  assert.deepStrictEqual(Object.keys(layers).sort(), [
    'bangla',
    'credits',
    'eyebrow',
    'subtitle',
    'english',
  ].sort());

  assert.strictEqual(DEFAULT_TITLE_KEYFRAMES.inAnim, 'slow-cinema-fade');
  assert.strictEqual(DEFAULT_TITLE_KEYFRAMES.staggerMode, 'block');

  const banglaWords = ['দৃষ্টির', 'অগ্নিবেগ', 'পরিচালনায়'];
  for (const w of banglaWords) {
    const graphemes = segmentTextGraphemes(w);
    assert.strictEqual(graphemes.join(''), w, `Grapheme segmentation must round-trip "${w}" losslessly`);
    assert.ok(graphemes.length < w.length, `Bangla conjunct "${w}" must cluster code points into fewer graphemes`);
  }
});

test('Mid-Side Vocal Remover DSP, pure RIFF WAV encoder, and Offline Foley synthesizer', () => {
  const sr = 48000;
  const n = 4800; // 100ms
  const left = new Float32Array(n);
  const right = new Float32Array(n);

  // Mid vocal (1kHz center-panned L === R) + Wide side guitar (1.5kHz out-of-phase L === -R)
  for (let i = 0; i < n; i++) {
    const t = i / sr;
    const mid = 0.5 * Math.sin(2 * Math.PI * 1000 * t);
    const side = 0.4 * Math.sin(2 * Math.PI * 1500 * t);
    left[i] = mid + side;
    right[i] = mid - side;
  }

  const inst = processMidSideStereoSamples(left, right, {
    mode: 'instrumental',
    suppressionPct: 100,
    bassRetainPct: 85,
    sampleRate: sr,
  });

  // Pure mid component should be heavily suppressed in instrumental mode
  const pureMidL = new Float32Array(n);
  const pureMidR = new Float32Array(n);
  for (let i = 0; i < n; i++) {
    const val = 0.5 * Math.sin(2 * Math.PI * 1000 * (i / sr));
    pureMidL[i] = val;
    pureMidR[i] = val;
  }
  const suppressedMid = processMidSideStereoSamples(pureMidL, pureMidR, {
    mode: 'instrumental',
    suppressionPct: 100,
    bassRetainPct: 85,
    sampleRate: sr,
  });
  let rmsIn = 0;
  let rmsInstOut = 0;
  for (let i = 400; i < n; i++) {
    rmsIn += pureMidL[i] * pureMidL[i];
    rmsInstOut += suppressedMid.leftOut[i] * suppressedMid.leftOut[i];
  }
  assert.ok(rmsInstOut < rmsIn * 0.05, 'Instrumental mode must cancel >=95% energy of 1kHz center-panned vocal');
  assert.ok(inst.leftOut.some((v) => Math.abs(v) > 0.2), 'Instrumental mode must preserve stereo side content');

  const acapella = processMidSideStereoSamples(left, right, {
    mode: 'acapella',
    suppressionPct: 100,
    bassRetainPct: 85,
    sampleRate: sr,
  });
  assert.ok(
    Math.abs(acapella.leftOut[500] - acapella.rightOut[500]) < 0.08,
    'Acapella mode must suppress wide L-R side content and isolate centered vocal'
  );

  const wavBytes = encodeStereoFloat32ToWavBytes(inst.leftOut, inst.rightOut, sr);
  assert.strictEqual(String.fromCharCode(...wavBytes.slice(0, 4)), 'RIFF');
  assert.strictEqual(String.fromCharCode(...wavBytes.slice(8, 12)), 'WAVE');
  assert.strictEqual(wavBytes.length, 44 + n * 4);

  assert.strictEqual(FOLEY_PRESETS.length, 5);
  const foleyWav = synthesizeFoleyRecipeToWavBytes(FOLEY_PRESETS[0], sr);
  assert.strictEqual(String.fromCharCode(...foleyWav.slice(0, 4)), 'RIFF');
  assert.strictEqual(String.fromCharCode(...foleyWav.slice(8, 12)), 'WAVE');
  assert.ok(foleyWav.length > 44);
});

test('34-Preset Lighting & Relighting Kelvin math and Stage overlay styles', () => {
  assert.strictEqual(LIGHTING_PRESETS.length, 34);

  const normalized = normalizeShotLightConfig({
    keyIntensity: 180,
    colorTempK: 1000,
    streakAngle: -90,
    keyPos: { x: 200, y: -10 },
  });
  assert.strictEqual(normalized.keyIntensity, 100);
  assert.strictEqual(normalized.colorTempK, 2400);
  assert.strictEqual(normalized.streakAngle, -45);
  assert.strictEqual(normalized.keyPos.x, 98);
  assert.strictEqual(normalized.keyPos.y, 2);

  const warm = kelvinToRgb(2600);
  const cool = kelvinToRgb(7200);
  assert.ok(warm.r > warm.b, 'Warm 2600K light must have higher R than B');
  assert.ok(cool.b >= cool.r, 'Cool 7200K light must have B >= R');

  const styles = buildStageLightOverlayStyles(normalized);
  assert.strictEqual(styles.hasConfig, true);
  assert.ok(styles.keyGradient.includes('radial-gradient'));
  assert.ok(styles.vignetteGradient.includes('radial-gradient'));
});
