/**
 * @file /src/data/lightingPresets.test.ts
 * @description Unit tests for 34-preset cinematic lighting engine.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  LIGHTING_PRESETS, 
  getLightingPresetById,
  LightingCategory
} from './lightingPresets';

test('Cinematic Lighting Engine - 34 Presets Registry', async (t) => {
  await t.test('should contain exactly 34 lighting presets', () => {
    assert.equal(LIGHTING_PRESETS.length, 34);
  });

  await t.test('should have unique IDs for all 34 presets', () => {
    const ids = LIGHTING_PRESETS.map(p => p.id);
    const uniqueIds = new Set(ids);
    assert.equal(uniqueIds.size, 34);
  });

  await t.test('should have unique names for all 34 presets', () => {
    const names = LIGHTING_PRESETS.map(p => p.name);
    const uniqueNames = new Set(names);
    assert.equal(uniqueNames.size, 34);
  });

  await t.test('should only use the 4 standard categories (ATMOSPHERE, OPTICAL, EXPOSURE, STUDIO)', () => {
    const validCategories: LightingCategory[] = ['ATMOSPHERE', 'OPTICAL', 'EXPOSURE', 'STUDIO'];
    LIGHTING_PRESETS.forEach(preset => {
      assert.ok(validCategories.includes(preset.category), `Invalid category: ${preset.category}`);
    });
  });

  await t.test('should have non-empty filter and valid blendMode for every preset', () => {
    const validBlendModes = [
      'overlay',
      'screen',
      'multiply',
      'hard-light',
      'color-dodge'
    ];
    LIGHTING_PRESETS.forEach(preset => {
      assert.ok(preset.filter && preset.filter.length > 0, `Filter must be non-empty for ${preset.id}`);
      assert.ok(validBlendModes.includes(preset.blendMode), `Invalid blendMode ${preset.blendMode} for ${preset.id}`);
    });
  });

  await t.test('should resolve presets correctly by ID using getLightingPresetById', () => {
    assert.equal(getLightingPresetById('high-key')?.name, 'High Key');
    assert.equal(getLightingPresetById('rembrandt')?.category, 'STUDIO');
    assert.equal(getLightingPresetById('venetian-blinds')?.category, 'OPTICAL');
    assert.equal(getLightingPresetById('golden-hour')?.category, 'ATMOSPHERE');
    assert.equal(getLightingPresetById('non-existent'), undefined);
    assert.equal(getLightingPresetById(null), undefined);
    assert.equal(getLightingPresetById(undefined), undefined);
  });

  await t.test('should safely execute renderOverlay with mock 2D canvas context', () => {
    const mockCtx = {
      createLinearGradient: () => ({
        addColorStop: () => {}
      }),
      createRadialGradient: () => ({
        addColorStop: () => {}
      }),
      fillRect: () => {},
      strokeRect: () => {},
      save: () => {},
      restore: () => {},
      beginPath: () => {},
      closePath: () => {},
      moveTo: () => {},
      lineTo: () => {},
      arc: () => {},
      fill: () => {},
      stroke: () => {},
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1
    } as unknown as CanvasRenderingContext2D;

    LIGHTING_PRESETS.forEach(preset => {
      assert.doesNotThrow(() => {
        preset.renderOverlay(mockCtx, 1920, 804, 1000);
      });
    });
  });

  await t.test('verifies that each of the 34 requested presets is present', () => {
    const expectedPresetNames = [
      'High Key', 'Low Key', 'Rembrandt', 'Butterfly', 'Split Light',
      'Loop Light', 'Broad Light', 'Short Light', 'Chiaroscuro', 'Silhouette',
      'Rim Light', 'Hard Light', 'Soft Light', 'Bounce Light', 'Top Light',
      'Underlight', 'Golden Hour', 'Blue Hour', 'Day for Night', 'Moonlight',
      'Window Light', 'Practical Light', 'Firelight', 'Venetian Blinds', 'Dappled Light',
      'Volumetric Light', 'Flat Light', 'Neon Light', 'Teal & Orange', 'Monochrome Red',
      'Screen Glow', 'Passing Light', 'Strobe Light', 'Theatrical Light'
    ];

    expectedPresetNames.forEach(expectedName => {
      const match = LIGHTING_PRESETS.find(p => p.name.toLowerCase() === expectedName.toLowerCase());
      assert.ok(match, `Missing expected preset: ${expectedName}`);
    });
  });
});
