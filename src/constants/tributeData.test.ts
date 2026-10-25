/**
 * @file /src/constants/tributeData.test.ts
 * @description Unit tests verifying strict standards for TRIBUTE_PROFILES:
 * - ALL CAPS performer names
 * - Strictly max-20-word descriptions (Country, Race, Awards, Achievements)
 * - Max-10-word criticNotes
 * - Exactly 11 legendary profiles
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { TRIBUTE_PROFILES, validateTributeProfile, getTributeProfileById } from './tributeData';

test('TRIBUTE_PROFILES Registry Standards', async (t) => {
  await t.test('should contain all 11 upgraded tribute profiles', () => {
    assert.equal(TRIBUTE_PROFILES.length, 11);
  });

  await t.test('should enforce ALL CAPS for performer names', () => {
    TRIBUTE_PROFILES.forEach(profile => {
      const performerMainName = profile.performer.split('//')[0].trim();
      assert.equal(performerMainName, performerMainName.toUpperCase());
    });
  });

  await t.test('should enforce strictly max-20-word descriptions', () => {
    TRIBUTE_PROFILES.forEach(profile => {
      const words = profile.description.trim().split(/\s+/).filter(Boolean);
      assert.ok(words.length <= 20, `Description exceeded 20 words (${words.length}): ${profile.description}`);
    });
  });

  await t.test('should enforce strictly max-10-word criticNote', () => {
    TRIBUTE_PROFILES.forEach(profile => {
      assert.ok(profile.criticNote, `Missing criticNote in ${profile.id}`);
      const words = profile.criticNote.trim().split(/\s+/).filter(Boolean);
      assert.ok(words.length <= 10, `criticNote exceeded 10 words (${words.length}): ${profile.criticNote}`);
    });
  });

  await t.test('should pass validateTributeProfile for every entry', () => {
    TRIBUTE_PROFILES.forEach(profile => {
      const validation = validateTributeProfile(profile);
      assert.equal(validation.isValid, true);
      assert.deepEqual(validation.errors, []);
    });
  });

  await t.test('should correctly retrieve profiles by ID', () => {
    const rani = getTributeProfileById('rani_mukherjee');
    assert.ok(rani);
    assert.equal(rani?.hook, 'BENGALI AURA');
    assert.ok(rani?.performer.includes('RANI MUKHERJEE'));
    assert.equal(rani?.criticNote, 'A powerhouse of emotion and unmatched screen presence.');
  });
});
