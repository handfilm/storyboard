import test from 'node:test';
import assert from 'node:assert';
import { LRUBlobUrlCache } from '../hooks/useVideoPlaybackEngine';
import { storyboardSyncService } from './storyboardSyncService';

test('LRUBlobUrlCache stores up to maximum capacity and evicts LRU item', () => {
  const cache = new LRUBlobUrlCache(3);

  // Stub URL.createObjectURL and URL.revokeObjectURL for Node environment
  const revokedUrls: string[] = [];
  (globalThis as any).URL = {
    createObjectURL: (b: any) => `blob:mock/${Math.random().toString(36)}`,
    revokeObjectURL: (u: string) => revokedUrls.push(u)
  };

  cache.set('asset-1', 'blob:asset-1');
  cache.set('asset-2', 'blob:asset-2');
  cache.set('asset-3', 'blob:asset-3');

  assert.strictEqual(cache.size(), 3);
  assert.strictEqual(cache.get('asset-1'), 'blob:asset-1');

  // Adding 4th item should evict 'asset-2' because 'asset-1' was accessed and refreshed
  cache.set('asset-4', 'blob:asset-4');

  assert.strictEqual(cache.size(), 3);
  assert.strictEqual(cache.has('asset-2'), false, 'asset-2 should have been evicted');
  assert.strictEqual(cache.has('asset-1'), true, 'asset-1 should be retained');
  assert.strictEqual(cache.has('asset-3'), true, 'asset-3 should be retained');
  assert.strictEqual(cache.has('asset-4'), true, 'asset-4 should be retained');

  assert.ok(revokedUrls.includes('blob:asset-2'), 'Evicted URL should be revoked');
});

test('LRUBlobUrlCache clears all URLs and revokes them cleanly', () => {
  const cache = new LRUBlobUrlCache(8);
  const revokedUrls: string[] = [];
  (globalThis as any).URL = {
    createObjectURL: (b: any) => `blob:mock/${Math.random().toString(36)}`,
    revokeObjectURL: (u: string) => revokedUrls.push(u)
  };

  cache.set('asset-a', 'blob:asset-a');
  cache.set('asset-b', 'blob:asset-b');
  assert.strictEqual(cache.size(), 2);

  cache.clear();
  assert.strictEqual(cache.size(), 0);
  assert.ok(revokedUrls.includes('blob:asset-a'));
  assert.ok(revokedUrls.includes('blob:asset-b'));
});

test('storyboardSyncService provides playback and thumbnail resolution interfaces', async () => {
  assert.ok(typeof storyboardSyncService.assignAssetToShot === 'function');
  assert.ok(typeof storyboardSyncService.unassignAsset === 'function');
  assert.ok(typeof storyboardSyncService.resolvePlaybackUrl === 'function');
  assert.ok(typeof storyboardSyncService.resolveThumbnailUrl === 'function');
  assert.ok(typeof storyboardSyncService.clearAllUrls === 'function');
});
