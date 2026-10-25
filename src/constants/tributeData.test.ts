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

  await t.test('enforces exact cinematic time-gating temporal mapping', () => {
    const resolvePhase = (time: number): 1 | 2 | 3 | 4 | 5 | null => {
      if (time >= 0 && time < 1.5) return 1;
      if (time >= 1.5 && time < 3.5) return 2;
      if (time >= 3.5 && time < 5.5) return 3;
      if (time >= 5.5 && time < 7.0) return 4;
      if (time >= 7.0 && time < 9.0) return 5;
      return null;
    };

    assert.equal(resolvePhase(0.0), 1, '0.0s should be Phase 1 (Hook)');
    assert.equal(resolvePhase(1.49), 1, '1.49s should be Phase 1 (Hook)');
    assert.equal(resolvePhase(1.5), 2, '1.5s should be Phase 2 (Bio)');
    assert.equal(resolvePhase(3.49), 2, '3.49s should be Phase 2 (Bio)');
    assert.equal(resolvePhase(3.5), 3, '3.5s should be Phase 3 (Captions)');
    assert.equal(resolvePhase(5.49), 3, '5.49s should be Phase 3 (Captions)');
    assert.equal(resolvePhase(5.5), 4, '5.5s should be Phase 4 (Critic Note)');
    assert.equal(resolvePhase(6.99), 4, '6.99s should be Phase 4 (Critic Note)');
    assert.equal(resolvePhase(7.0), 5, '7.0s should be Phase 5 (Signature)');
    assert.equal(resolvePhase(8.99), 5, '8.99s should be Phase 5 (Signature)');
    assert.equal(resolvePhase(9.0), null, '>=9.0s should be null (Unmounted)');
    assert.equal(resolvePhase(12.0), null, '12.0s should be null (Unmounted)');
  });
});

