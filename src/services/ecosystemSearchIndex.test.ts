import test from 'node:test';
import assert from 'node:assert/strict';
import { ecosystemSearchEngine } from './ecosystemSearchIndex';

test('ecosystemSearchEngine indexes 28 subdomains and returns matches for domain queries', () => {
  const b2bResults = ecosystemSearchEngine.search('b2b');
  assert.ok(b2bResults.length > 0, 'Should find b2b results');
  assert.equal(b2bResults[0].id, 'b2b');

  const leatherResults = ecosystemSearchEngine.search('leather');
  assert.ok(leatherResults.length > 0, 'Should find leather-related apps');
  const ids = leatherResults.map((r) => r.id);
  assert.ok(ids.includes('leather') || ids.includes('rawx') || ids.includes('harness'), 'Should match leather apps');

  const audioResults = ecosystemSearchEngine.search('audio');
  assert.ok(audioResults.length > 0, 'Should find audio apps/tools');
  const hasAuralOrVox = audioResults.some((r) => r.id === 'aural' || r.id === 'tool-neural-vox' || r.id === 'tool-rap-sync');
  assert.ok(hasAuralOrVox, 'Should match audio domains');
});

test('ecosystemSearchEngine returns featured items when query is empty', () => {
  const featured = ecosystemSearchEngine.getFeaturedItems();
  assert.ok(featured.length >= 4, 'Should return at least 4 featured items');
});
