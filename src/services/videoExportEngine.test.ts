import { test } from 'node:test';
import assert from 'node:assert';
import { 
  parseShotSelection, 
  getExportPresetDimensions, 
  getBitrateBps 
} from './videoExportEngine';

test('parseShotSelection parses single active shot', () => {
  const result = parseShotSelection('current', 1, 1, '', 100, 4, 288);
  assert.strictEqual(result.totalShots, 1);
  assert.deepStrictEqual(result.indices, [4]);
  assert.strictEqual(result.totalFrames, 288);
  assert.strictEqual(result.durationSec, 12.0);
  assert.strictEqual(result.label, 'SH005');
});

test('parseShotSelection parses range mode', () => {
  const result = parseShotSelection('range', 1, 12, '', 100, 0, 288);
  assert.strictEqual(result.totalShots, 12);
  assert.strictEqual(result.indices[0], 0);
  assert.strictEqual(result.indices[11], 11);
  assert.strictEqual(result.totalFrames, 12 * 288);
  assert.strictEqual(result.durationSec, 144.0);
  assert.strictEqual(result.label, 'SH001-SH012');
});

test('parseShotSelection parses custom tags with ranges and singles', () => {
  const result = parseShotSelection('custom', 1, 10, '1, 4, 7-10, 19', 100, 0, 288);
  // Indices (0-indexed): 0, 3, 6, 7, 8, 9, 18 => 7 shots
  assert.strictEqual(result.totalShots, 7);
  assert.deepStrictEqual(result.indices, [0, 3, 6, 7, 8, 9, 18]);
  assert.strictEqual(result.totalFrames, 7 * 288);
  assert.strictEqual(result.durationSec, 7 * 12.0);
  assert.strictEqual(result.label, 'SH001-SH019');
});

test('getExportPresetDimensions provides valid even dimensions for all presets', () => {
  const presets = ['1080p_scope', '4k_scope', '1080p_standard', '4k_standard', '9_16_vertical'] as const;
  for (const preset of presets) {
    const dim = getExportPresetDimensions(preset);
    assert.strictEqual(dim.width % 2, 0, `${preset} width must be even for H.264`);
    assert.strictEqual(dim.height % 2, 0, `${preset} height must be even for H.264`);
  }

  const vertical = getExportPresetDimensions('9_16_vertical');
  assert.strictEqual(vertical.width, 1080);
  assert.strictEqual(vertical.height, 1920);
  assert.strictEqual(vertical.isVertical, true);

  const scope4K = getExportPresetDimensions('4k_scope');
  assert.strictEqual(scope4K.width, 3840);
  assert.strictEqual(scope4K.height, 1608);
  assert.strictEqual(scope4K.isScope, true);
});

test('getBitrateBps provides broadcast and master specifications', () => {
  const broadcast1080p = getBitrateBps('broadcast', false);
  assert.strictEqual(broadcast1080p, 28_000_000);

  const master4K = getBitrateBps('master', true);
  assert.strictEqual(master4K, 80_000_000);
});

test('parseShotSelection filters out excludedIndices accurately', () => {
  // Range 1 to 5 (indices 0, 1, 2, 3, 4), exclude indices 1 and 3 (shots 2 and 4)
  const result = parseShotSelection('range', 1, 5, '', 100, 0, 288, [1, 3]);
  assert.strictEqual(result.totalShots, 3);
  assert.deepStrictEqual(result.indices, [0, 2, 4]);
  assert.strictEqual(result.totalFrames, 3 * 288);
  assert.strictEqual(result.durationSec, 36.0);
});

