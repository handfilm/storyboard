/**
 * RAWx Studio — Master Unit Test Suite (node:test)
 * Tests pure logic functions across the studio architecture.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { toBengaliNumerals } from '../utils/engine';
import { featureFlags } from './featureFlags';
import { HistoryManager } from './history';
import { parseFountainScript } from '../data/fountainIO';

test('toBengaliNumerals converts ASCII digits into authentic Bengali digits', () => {
  assert.equal(toBengaliNumerals('001'), '০০১');
  assert.equal(toBengaliNumerals('100'), '১০০');
  assert.equal(toBengaliNumerals('EP 042'), 'EP ০৪২');
});

test('Feature flags allow runtime reading and progressive overrides', () => {
  const flags = featureFlags.getAll();
  assert.equal(typeof flags.enableBoardMode, 'boolean');

  featureFlags.set('enableBoardMode', false);
  assert.equal(featureFlags.get('enableBoardMode'), false);
  featureFlags.set('enableBoardMode', true);
  assert.equal(featureFlags.get('enableBoardMode'), true);
});

test('HistoryManager correctly tracks past states and manages undo/redo stack', () => {
  const history = new HistoryManager<number>(0);
  assert.equal(history.canUndo(), false);
  assert.equal(history.canRedo(), false);

  history.push(1, 'Set to 1');
  history.push(2, 'Set to 2');
  assert.equal(history.canUndo(), true);

  const prev1 = history.undo();
  assert.equal(prev1, 1);
  assert.equal(history.canRedo(), true);

  const redo1 = history.redo();
  assert.equal(redo1, 2);
});

test('parseFountainScript parses scene blocks and dialogue in Bengali and English', () => {
  const script = `
INT. DHAKA CYBER ALLEY - NIGHT

Rain lashes against the neon pavement.

RAKIB
Initiate optical lens sequence.

দৃশ্য ২: মহাজাগতিক পোর্টাল // EXT. VOID - CONTINUOUS
বৃষ্টি থেমে যায় শূন্যতায়।
`;
  const scenes = parseFountainScript(script);
  assert.ok(scenes.length >= 2, 'Should detect at least 2 scenes');
  assert.ok(scenes[0].heading.includes('DHAKA CYBER ALLEY'));
  assert.equal(scenes[0].dialogueBlocks[0].character, 'RAKIB');
  assert.ok(scenes[1].heading.includes('দৃশ্য ২'));
});
