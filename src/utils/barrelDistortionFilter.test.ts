import test from 'node:test';
import assert from 'node:assert/strict';
import {
  clampBarrelDistortion,
  calculateRadialDisplacementPixel
} from './barrelDistortionFilter';

test('clampBarrelDistortion clamps inputs cleanly to 0..1 range', () => {
  assert.equal(clampBarrelDistortion(0), 0);
  assert.equal(clampBarrelDistortion(0.456), 0.46);
  assert.equal(clampBarrelDistortion(-0.5), 0);
  assert.equal(clampBarrelDistortion(1.5), 1);
  assert.equal(clampBarrelDistortion(undefined), 0);
  assert.equal(clampBarrelDistortion(NaN), 0);
  assert.equal(clampBarrelDistortion('invalid'), 0);
});

test('calculateRadialDisplacementPixel returns neutral 128 at viewport center', () => {
  const center = calculateRadialDisplacementPixel(0.5, 0.5);
  assert.equal(center.r, 128);
  assert.equal(center.g, 128);
});

test('calculateRadialDisplacementPixel returns symmetric radial displacement', () => {
  const left = calculateRadialDisplacementPixel(0.1, 0.5);
  const right = calculateRadialDisplacementPixel(0.9, 0.5);
  assert.ok(left.r < 128, `Left pixel red channel should be < 128, got ${left.r}`);
  assert.ok(right.r > 128, `Right pixel red channel should be > 128, got ${right.r}`);
  assert.equal(left.g, 128);
  assert.equal(right.g, 128);
});
