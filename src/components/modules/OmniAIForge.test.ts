import { test } from 'node:test';
import assert from 'node:assert/strict';
import { TEMPLATES, CINEMATIC_TITLE_PRESETS, TitleTemplatePreset } from '../../constants/titleTemplates';
import { CORPORATE_PROFILES, CorporateProfile } from '../../constants/corporateData';
import { OmniAIForge } from './OmniAIForge';

test('Omni-AI Forge & Corporate Template Integration', async (t) => {
  await t.test('TEMPLATES is exported and equals CINEMATIC_TITLE_PRESETS', () => {
    assert.ok(Array.isArray(TEMPLATES), 'TEMPLATES should be an array');
    assert.equal(TEMPLATES.length, CINEMATIC_TITLE_PRESETS.length);
    assert.ok(TEMPLATES.length >= 15, 'Should have at least 15 title templates');
  });

  await t.test('Corporate templates are properly appended with category "corporate"', () => {
    const corporateTemplates = TEMPLATES.filter((tpl: TitleTemplatePreset) => tpl.category === 'corporate');
    assert.equal(corporateTemplates.length, 5, 'Should have exactly 5 corporate templates');

    CORPORATE_PROFILES.forEach((profile: CorporateProfile) => {
      const match = corporateTemplates.find((tpl: TitleTemplatePreset) => tpl.id === profile.id);
      assert.ok(match, `Template for ${profile.id} should exist`);
      assert.equal(match.category, 'corporate');
      assert.equal(match.primaryText, profile.hook);
      assert.equal(match.secondaryText, profile.subText);
      assert.equal(match.callToAction, profile.callToAction);
      assert.ok(match.mockImage, 'Mock image should be defined');
    });
  });

  await t.test('OmniAIForge component is defined and exported', () => {
    assert.equal(typeof OmniAIForge, 'function', 'OmniAIForge should be a functional component');
  });

  await t.test('PRESET_CATEGORIES includes Dopamine Engine viral rhythmic option', async () => {
    const { PRESET_CATEGORIES, ALL_PROMPT_STYLES } = await import('./OmniAIForge');
    const dopamineCategory = PRESET_CATEGORIES.find(c => c.id === 'dopamine');
    assert.ok(dopamineCategory, 'Dopamine category must exist in PRESET_CATEGORIES');
    assert.ok(dopamineCategory.label.includes('Dopamine Engine'), 'Label should mention Dopamine Engine');

    const dopamineStyles = ALL_PROMPT_STYLES.filter(s => s.category === 'dopamine');
    assert.ok(dopamineStyles.length >= 3, 'Must have at least 3 dopamine styles');
    assert.ok(dopamineStyles.some(s => s.id === 'viral_loop_1'), 'Must include viral_loop_1');
    assert.ok(dopamineStyles.some(s => s.id === 'viral_loop_2'), 'Must include viral_loop_2');
    assert.ok(dopamineStyles.some(s => s.id === 'viral_loop_3'), 'Must include viral_loop_3');
  });
});
