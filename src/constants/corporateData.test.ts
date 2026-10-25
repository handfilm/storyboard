/**
 * @file /src/constants/corporateData.test.ts
 * @description Unit tests verifying Corporate B2B suite expansion:
 * - 5 industry-specific profiles
 * - Clean integration into CINEMATIC_TITLE_PRESETS
 * - Safe expansion without touching TRIBUTE templates or existing presets
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { CORPORATE_PROFILES, getCorporateProfileById } from './corporateData';
import { CINEMATIC_TITLE_PRESETS } from './titleTemplates';
import { TRIBUTE_PROFILES } from './tributeData';

test('Corporate B2B Data & Title Templates Registry', async (t) => {
  await t.test('CORPORATE_PROFILES should contain 5 industry templates', () => {
    assert.equal(CORPORATE_PROFILES.length, 5);
    const expectedIds = ['corp_fintech', 'corp_fashion', 'corp_realestate', 'corp_fmcg', 'corp_telco'];
    expectedIds.forEach(id => {
      const found = getCorporateProfileById(id);
      assert.ok(found, `Missing corporate profile with id: ${id}`);
      assert.ok(found?.hook);
      assert.ok(found?.subText);
      assert.ok(found?.callToAction);
      assert.ok(found?.mockImage);
      assert.ok(found?.industry);
    });
  });

  await t.test('CINEMATIC_TITLE_PRESETS should include corporate templates without disrupting existing ones', () => {
    // Total is now 15 (10 original + 5 corporate)
    assert.equal(CINEMATIC_TITLE_PRESETS.length, 15);

    const corporatePresets = CINEMATIC_TITLE_PRESETS.filter(p => p.category === 'corporate');
    assert.equal(corporatePresets.length, 5);

    // Verify all 5 corporate presets contain required metadata
    const fintech = corporatePresets.find(p => p.id === 'corp_fintech');
    assert.ok(fintech);
    assert.equal(fintech?.primaryText, '10% CASHBACK // ZERO FEES');
    assert.equal(fintech?.callToAction, 'DOWNLOAD THE APP NOW');
    assert.ok(fintech?.mockImage?.startsWith('https://images.unsplash.com'));

    const fashion = corporatePresets.find(p => p.id === 'corp_fashion');
    assert.ok(fashion);
    assert.equal(fashion?.primaryText, '// WINTER DROP 2026 //');
    assert.equal(fashion?.callToAction, 'SHOP THE COLLECTION');

    const realestate = corporatePresets.find(p => p.id === 'corp_realestate');
    assert.ok(realestate);
    assert.equal(realestate?.primaryText, 'REDEFINING THE SKYLINE');

    const fmcg = corporatePresets.find(p => p.id === 'corp_fmcg');
    assert.ok(fmcg);
    assert.equal(fmcg?.primaryText, '48 HOURS ONLY // 50% OFF');

    const telco = corporatePresets.find(p => p.id === 'corp_telco');
    assert.ok(telco);
    assert.equal(telco?.primaryText, 'CONNECTING 170 MILLION');
  });

  await t.test('TRIBUTE_PROFILES should remain completely intact with all 11 profiles', () => {
    assert.equal(TRIBUTE_PROFILES.length, 11);
  });
});
