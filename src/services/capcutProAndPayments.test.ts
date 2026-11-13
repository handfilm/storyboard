import test from 'node:test';
import assert from 'node:assert/strict';

import {
  PRICING_MATRIX,
  computePlanPrice,
  validateManualTrxId,
  buildPayPalOrderPayload,
  buildNagadSensitiveData
} from '../server/paymentGateways.ts';
import {
  applyEasing,
  interpolateClipKeyframes,
  detectAudioTransientBeatMarkers,
  computeLufs14NormalizationGain,
  resolveExportEntitlementPolicy
} from './proSuiteEngine.ts';
import {
  SPEED_RAMP_PRESETS,
  getSpeedRampFactorAtProgress
} from '../utils/speedReelsEngine.ts';

test('PRICING_MATRIX and computePlanPrice return exact BDT and USD monthly/annual amounts', () => {
  assert.equal(PRICING_MATRIX.pro.monthlyUSD, 19.99);
  assert.equal(PRICING_MATRIX.pro.monthlyBDT, 1490);
  assert.equal(PRICING_MATRIX.ultra.monthlyUSD, 39.99);
  assert.equal(PRICING_MATRIX.ultra.monthlyBDT, 2990);
  assert.equal(PRICING_MATRIX.teams.monthlyUSD, 14.99);

  assert.equal(computePlanPrice('pro', 'monthly', 'BDT'), 1490);
  assert.equal(computePlanPrice('pro', 'annual', 'BDT'), 14300);
  assert.equal(computePlanPrice('ultra', 'monthly', 'USD'), 39.99);
  assert.equal(computePlanPrice('teams', 'annual', 'USD'), 143.0);
});

test('validateManualTrxId validates TrxID length, charset, and rejects blanks/short inputs', () => {
  const valid = validateManualTrxId('  bkh8x92k4p ');
  assert.equal(valid.valid, true);
  assert.equal(valid.cleaned, 'BKH8X92K4P');

  const empty = validateManualTrxId('   ');
  assert.equal(empty.valid, false);

  const tooShort = validateManualTrxId('ABC12');
  assert.equal(tooShort.valid, false);

  const badChars = validateManualTrxId('BKH$8X92K4P!');
  assert.equal(badChars.valid, false);
});

test('buildPayPalOrderPayload constructs strict PayPal REST v2 CAPTURE order payload', () => {
  const payload = buildPayPalOrderPayload({
    proTier: 'ultra',
    plan: 'monthly',
    amountUsd: 39.99,
    invoiceId: 'HF-INV-001',
    returnUrl: 'https://handfilm.studio/?paypal=return',
    cancelUrl: 'https://handfilm.studio/?paypal=cancel'
  });

  assert.equal(payload.intent, 'CAPTURE');
  assert.equal(payload.purchase_units[0].reference_id, 'ultra_monthly');
  assert.equal(payload.purchase_units[0].invoice_id, 'HF-INV-001');
  assert.equal(payload.purchase_units[0].amount.currency_code, 'USD');
  assert.equal(payload.purchase_units[0].amount.value, '39.99');
  assert.equal(payload.application_context.brand_name, 'HANDFILM STUDIO');
});

test('buildNagadSensitiveData packages merchantId, datetime, orderId, and challenge', () => {
  const sensitive = buildNagadSensitiveData({
    merchantId: '683002007104225',
    orderId: 'HFNGD123456',
    datetime: '20261113153000',
    challenge: 'abcdef123456'
  });

  assert.deepEqual(sensitive, {
    merchantId: '683002007104225',
    datetime: '20261113153000',
    orderId: 'HFNGD123456',
    challenge: 'abcdef123456'
  });
});

test('applyEasing and interpolateClipKeyframes interpolate X/Y, scale, rotation, opacity, and volume cleanly', () => {
  assert.equal(applyEasing(0, 'linear'), 0);
  assert.equal(applyEasing(1, 'ease-in-out'), 1);
  assert.ok(applyEasing(0.5, 'ease-in') < 0.5);
  assert.ok(applyEasing(0.5, 'ease-out') > 0.5);
  assert.equal(applyEasing(0.5, 'ease-in-out'), 0.5);

  const kfResult = interpolateClipKeyframes(
    [
      { id: 'k1', timeNorm: 0, x: 0, y: 0, scale: 1, rotation: 0, opacity: 1, volume: 1, easing: 'linear' },
      { id: 'k2', timeNorm: 1, x: 20, y: -10, scale: 1.5, rotation: 18, opacity: 0.5, volume: 0.2, easing: 'linear' }
    ],
    0.5
  );

  assert.equal(kfResult.x, 10);
  assert.equal(kfResult.y, -5);
  assert.equal(kfResult.scale, 1.25);
  assert.equal(kfResult.rotation, 9);
  assert.equal(kfResult.opacity, 0.75);
  assert.equal(kfResult.volume, 0.6);
});

test('detectAudioTransientBeatMarkers and computeLufs14NormalizationGain compute deterministic DSP values', () => {
  const beats = detectAudioTransientBeatMarkers(120, 4.0, 1);
  assert.deepEqual(beats, [0.5, 1, 1.5, 2, 2.5, 3, 3.5]);

  const halfBeats = detectAudioTransientBeatMarkers(120, 2.0, 2);
  assert.deepEqual(halfBeats, [0.25, 0.5, 0.75, 1, 1.25, 1.5, 1.75]);

  // Measured at -14 LUFS needs unity gain 1.0
  assert.equal(computeLufs14NormalizationGain(-14), 1);
  // Measured at -20 LUFS (+6dB boost ~ 1.9953)
  const boostGain = computeLufs14NormalizationGain(-20);
  assert.ok(boostGain > 1.99 && boostGain < 2.01);
});

test('resolveExportEntitlementPolicy differentiates Free/Unauthenticated from Active Trial and Pro', () => {
  const freePolicy = resolveExportEntitlementPolicy({ authenticated: false, tier: 'unauthenticated' });
  assert.equal(freePolicy.hasProOrTrial, false);
  assert.equal(freePolicy.maxWidth, 1280);
  assert.equal(freePolicy.maxHeight, 720);
  assert.equal(freePolicy.watermarkRequired, true);
  assert.equal(freePolicy.allowAlphaExport, false);
  assert.deepEqual(freePolicy.allowedFps, [24, 30]);

  const expiredFreePolicy = resolveExportEntitlementPolicy({ authenticated: true, tier: 'free' });
  assert.equal(expiredFreePolicy.watermarkRequired, true);

  const trialPolicy = resolveExportEntitlementPolicy({ authenticated: true, tier: 'trial' });
  assert.equal(trialPolicy.hasProOrTrial, true);
  assert.equal(trialPolicy.maxWidth, 3840);
  assert.equal(trialPolicy.maxHeight, 2160);
  assert.equal(trialPolicy.watermarkRequired, false);
  assert.equal(trialPolicy.allowAlphaExport, true);
  assert.deepEqual(trialPolicy.allowedFps, [24, 30, 60]);

  const proPolicy = resolveExportEntitlementPolicy({ authenticated: true, tier: 'pro' });
  assert.equal(proPolicy.hasProOrTrial, true);
  assert.equal(proPolicy.watermarkRequired, false);
  assert.equal(proPolicy.allowAlphaExport, true);
});

test('SPEED_RAMP_PRESETS includes HERO, BULLET, and MONTAGE with expected non-linear velocity curves', () => {
  const ids = SPEED_RAMP_PRESETS.map((p) => p.id);
  assert.ok(ids.includes('HERO'));
  assert.ok(ids.includes('BULLET'));
  assert.ok(ids.includes('MONTAGE'));

  assert.ok(getSpeedRampFactorAtProgress('HERO', 0.5) < 0.6);
  assert.ok(getSpeedRampFactorAtProgress('HERO', 0.05) > 1.5);
  assert.ok(getSpeedRampFactorAtProgress('BULLET', 0.5) < 0.5);
  assert.ok(getSpeedRampFactorAtProgress('MONTAGE', 0.33) > 2.0);
});
