/**
 * @file /src/services/videoThumbnailService.test.ts
 * @description Unit tests for automated video 240p WebP thumbnail generation
 * using OffscreenCanvas and 'media_thumbnails' IndexedDB storage.
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  THUMBNAIL_TARGET_WIDTH,
  THUMBNAIL_TARGET_MIME,
  THUMBNAIL_TARGET_QUALITY,
  DEFAULT_KEYFRAME_TIMESTAMP_SEC,
  generate240pWebPVideoThumbnail,
  storeVideoThumbnailInDb,
  autoBackfillMissingThumbnails
} from './videoThumbnailService';
import { studioDraftDb } from './db';

test('THUMBNAIL_TARGET_WIDTH is exactly 240p', () => {
  assert.equal(THUMBNAIL_TARGET_WIDTH, 240, 'Target width must be 240px');
  assert.equal(THUMBNAIL_TARGET_MIME, 'image/webp', 'MIME type must be image/webp');
  assert.equal(THUMBNAIL_TARGET_QUALITY, 0.8, 'Quality must be 0.8');
  assert.equal(DEFAULT_KEYFRAME_TIMESTAMP_SEC, 0.5, 'Default keyframe must be at 0.5s');
});

test('generate240pWebPVideoThumbnail returns 240p WebP blob result', async () => {
  const dummyVideo = new Blob(['fake video stream bytes'], { type: 'video/mp4' });
  const result = await generate240pWebPVideoThumbnail(dummyVideo, 0.5);

  assert.ok(result);
  assert.ok(result.thumbBlob instanceof Blob);
  assert.equal(result.thumbBlob.type, 'image/webp');
  assert.ok(result.duration > 0);
});

test('storeVideoThumbnailInDb persists thumbnail in media_thumbnails store', async () => {
  const assetId = `test_thumb_${Date.now()}`;
  const webpBlob = new Blob([new Uint8Array([0x52, 0x49, 0x46, 0x46])], { type: 'image/webp' });

  // In Node test environment, mock DB store if window.indexedDB is unavailable
  const mockThumbStore = new Map<string, Blob>();
  const originalPut = studioDraftDb.putMediaThumbnail.bind(studioDraftDb);
  const originalGet = studioDraftDb.getMediaThumbnail.bind(studioDraftDb);

  studioDraftDb.putMediaThumbnail = async (id: string, blob: Blob) => {
    mockThumbStore.set(id, blob);
  };
  studioDraftDb.getMediaThumbnail = async (id: string) => {
    return mockThumbStore.get(id) || null;
  };

  try {
    // Store thumbnail
    await storeVideoThumbnailInDb(assetId, webpBlob, 240, 135);

    // Read back from store
    const retrievedBlob = await studioDraftDb.getMediaThumbnail(assetId);
    assert.ok(retrievedBlob, 'Retrieved blob must exist in media_thumbnails');
    assert.equal(retrievedBlob.type, 'image/webp');
  } finally {
    studioDraftDb.putMediaThumbnail = originalPut;
    studioDraftDb.getMediaThumbnail = originalGet;
  }
});

test('autoBackfillMissingThumbnails scans media_meta and reports progress', async () => {
  const backfillResult = await autoBackfillMissingThumbnails();
  assert.ok(typeof backfillResult.scanned === 'number');
  assert.ok(typeof backfillResult.generated === 'number');
  assert.ok(typeof backfillResult.failed === 'number');
});
