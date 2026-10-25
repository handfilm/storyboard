/**
 * @file /src/constants/compilationData.test.ts
 * @description Unit tests for Dopamine Engine compilation presets:
 * - Verifies base presets: viral_loop_1, viral_loop_2, viral_loop_3
 * - Verifies required fields: hook, subText, glitch, speed
 * - Verifies helper functions and retrieval
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { 
  COMPILATION_PRESETS, 
  getCompilationPresetById, 
  DEFAULT_COMPILATION_PRESET 
} from './compilationData';

test('Dopamine Engine Compilation Presets Registry', async (t) => {
  await t.test('contains all required ultra-viral base presets', () => {
    const ids = COMPILATION_PRESETS.map((p) => p.id);
    assert.ok(ids.includes('viral_loop_1'), 'Must include viral_loop_1');
    assert.ok(ids.includes('viral_loop_2'), 'Must include viral_loop_2');
    assert.ok(ids.includes('viral_loop_3'), 'Must include viral_loop_3');
  });

  await t.test('viral_loop_1 matches specification', () => {
    const preset = getCompilationPresetById('viral_loop_1');
    assert.equal(preset.name, 'THE HYPNOTIC TURN');
    assert.equal(preset.hook, 'PURE RHYTHM');
    assert.equal(preset.subText, 'Visual Physics at Work.');
    assert.equal(preset.glitch, 80);
    assert.equal(preset.speed, 1.5);
  });

  await t.test('viral_loop_2 matches specification', () => {
    const preset = getCompilationPresetById('viral_loop_2');
    assert.equal(preset.name, 'MACRO OBSESSION');
    assert.equal(preset.hook, 'CLOSER');
    assert.equal(preset.subText, 'Every detail amplified.');
    assert.equal(preset.glitch, 40);
    assert.equal(preset.speed, 0.8);
  });

  await t.test('viral_loop_3 matches specification', () => {
    const preset = getCompilationPresetById('viral_loop_3');
    assert.equal(preset.name, 'THE 360 AURA');
    assert.equal(preset.hook, 'UNBROKEN');
    assert.equal(preset.subText, 'A continuous loop of perfection.');
    assert.equal(preset.glitch, 100);
    assert.equal(preset.speed, 2.0);
  });

  await t.test('all presets have valid glitch and speed ranges', () => {
    COMPILATION_PRESETS.forEach((preset) => {
      assert.ok(preset.glitch >= 0 && preset.glitch <= 100, `Glitch must be 0-100: ${preset.glitch}`);
      assert.ok(preset.speed > 0 && preset.speed <= 5, `Speed must be positive and reasonable: ${preset.speed}`);
      assert.ok(preset.hook.length > 0, 'Hook text must be non-empty');
      assert.ok(preset.subText.length > 0, 'SubText must be non-empty');
    });
  });

  await t.test('getCompilationPresetById returns default preset when id is invalid', () => {
    const fallback = getCompilationPresetById('non_existent_preset');
    assert.equal(fallback.id, DEFAULT_COMPILATION_PRESET.id);
  });
});
